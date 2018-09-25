if (!Array.prototype.includes) {
    Object.defineProperty(Array.prototype, "includes", {
        enumerable: false,
        value: function(obj) {
            var newArr = this.filter(function(el) {
                return el == obj;
            });
            return newArr.length > 0;
        }
    });
}
if (!Element.prototype.remove) {
    Element.prototype.remove = function() {
        if (this.parentNode) {
            this.parentNode.removeChild(this);
        }
    };
}

$(function() {
    $.fn.citySelector = function() {
        $(this).select2({
            language: 'ru',
            ajax: {
                url: '/rest/city',
                dataType: 'json',
                delay: 250,
                data: function(params) {
                    return {
                        name: params.term,
                        limit: 10,
                        exclude_country: true
                    };
                },
                processResults: function (data) {
                    var options = [];
                    $.each(data, function (key, item) {
                        options.push({
                            id: item.osm_id,
                            text: item.name + (item.state ? ', ' + item.state : '') + ', ' + item.country
                        });
                    });
                    return {results: options};
                }
            }
        });
    };

    $.fn.addressSelector = function() {
        var elem = $(this),
            target = elem.parent('span').next('input');
        elem.suggestions({
            token: "171e25c2357362a4cc41a7c987eb02518def710f",
            type: "ADDRESS",
			geoLocation: false,
            minChars: 3,
            wait: 10,
            onSelect: function (suggestion) {
                find_nearest_osm(suggestion.data.geo_lat, suggestion.data.geo_lon, target)
            }
        });
    };

    $.fn.partnerSelector = function() {
        var $this = $(this),
            data = {term: '', limit: 100};
        $.when(
            $.ajax({
                url: '/rest/partner',
                dataType: 'json',
                data: data,
            }),
            $.ajax({
                url: '/rest/partnerGroup',
                dataType: 'json',
                data: data,
            })
        ).done(function(answer1, answer2) {
            var partners = [], partnersGroups = [], result = {results: []};
            $.each(answer1[0], function(k, v) {
                partners.push({id: 'p:' + v.id, text: v.p_name.trim() || ''});
            });
            $.each(answer2[0], function(k, v) {
                partnersGroups.push({id: 'g:' + v.id, text: v.name.trim() || ''});
            });
            if (partners.length) {
                result['results'].push({text: 'Партнёры', children: partners});
            }
            if (partnersGroups.length) {
                result['results'].push({text: 'Группы партнёров', children: partnersGroups});
            }
            $this.select2({
                multiple: true,
                data: partners.concat(partnersGroups),
                containerCssClass: 'Dropdown-NoSearch',
                dropdownCssClass: 'Dropdown-NoSearch'
            });
        });
    };

    $.fn.userSelector = function() {
        var $this = $(this);
        $this.select2({
            width: '100%',
            ajax: {
                url: '/rest/user',
                dataType: 'json',
                data: function(params) {
                    return {
                        my_company: true,
                        mobile: params['term'],
                        limit: 10
                    };
                },
                processResults: function(data, params) {
                    return {results: data};
                },
            },
            templateResult: function(data) {
                if (data.loading) {
                    return data.text;
                }
                return data.name + ' ' + data.mobile;
            },
            templateSelection: function(data) {
                if (data.id === '') {
                    return $this.data('placeholder');
                }
                return data.name + ' '+ data.mobile;
            }
        });
    };

    $('[data-type="DistanceForm"]').each(function() {
        var form = $(this),
            field_index = 0,
            code_start = parseInt(form.attr('data-keyCode-start'));
        if (isNaN(code_start) || !(code_start > 0)) {
            code_start = 65;
        }

        form
        .on('click', '[data-type="DistanceForm_AddField"]', function() {
            var that = $(this),
                name = that.attr('data-DistanceForm_FieldName'),
                field_name = '' + name + field_index,
                selector = that.attr('data-DistanceForm_FieldId');
            if (selector == '' || selector == null || selector.length < 1) {
                selector = '#DistanceForm_AddFieldTemplate';
            }
            var template = $($(selector).html()),
                temlate_index = 0,
                num = template.find('[data-type="DistanceForm_Numeration"]');
            if (num.length) {
                num.html(String.fromCharCode(code_start + field_index));
            }
            form.addClass('DistanceForm_AddedField');
            form.find('[data-type="DistanceForm_AddBefore"]').before(template);
            template.find('[data-dropdown]').each(function() {
                dropdown_styled($(this));
            });
            template.find('[data-autocomplite]').each(function() {
                $(this).addressSelector();
            });
            field_index++;
            return false;
        })
        .on('click', '[data-type="DistanceForm_DeleteField"]', function() {
            var that = $(this).parents('[data-type="Textbox_WithClose"]:first');
            that.remove();
            var count = form.find('[data-type="DistanceForm_DeleteField"]').length;
            if (count <= 0) {
                form.removeClass('DistanceForm_AddedField');
            }
            return false;
        })
        .on('click', '[data-type="DistanceForm_ButtonReverse"]', function() {
            var sender = form.find('[data-type="DistanceForm_FieldSender"]'),
                recipient = form.find('[data-type="DistanceForm_FieldRecipient"]'),
                sender_text = sender.val(),
                recipient_text = recipient.val();
            sender.val(recipient_text);
            recipient.val(sender_text);
            return false;
        });
    });

    $('[name="load[osm_id]"]').citySelector();
    $('[name="load[route][]"]').suggestions({
        token: "171e25c2357362a4cc41a7c987eb02518def710f",
        type: "ADDRESS",
		geoLocation: false,
        minChars: 3,
        wait: 10,
        onSelect: function(suggestion) {
            find_nearest_osm(suggestion.data.geo_lat, suggestion.data.geo_lon, $(this).parent('span').next('input'));
        }
    });

    $('[data-field="access_list"]').partnerSelector();
    $('[data-field="contact_user_id"]').userSelector();
    $(document)
    .on('change init', '[name="load[visibility]"]', function() {
        var value = $(this).val();
        $('[data-field="access_list"]').closest('.Form_Item')[value == '1' ? 'show' : 'hide']();
        if (value != '1') {
            $('[data-field="contacts_for_all"]').prop('checked', true);
        }
    });

    $('[name="load[visibility]"]').trigger('init');
});

var find_nearest_osm = function(lat, lng, elem) {
    $.ajax({
        url: '/rest/city',
        data: {
            lat: lat,
            lng: lng,
            limit: 1
        },
        dataType: 'json',
        type: 'get',
        success: function(data) {
            elem.val(data[0].id);
        }
    });
};


$(function() {
    $(document)
    // show/hide company
    .on('change', '[data-company="checkbox"]', function() {
        if ($(this).is(':checked')) {
            $('[data-company="block"]').slideDown(200);
        } else {
            $('[data-company="block"]').slideUp(200);
        }
    });

    function change_showhide_date(obj) {
        obj.field[obj.checked ? 'show' : 'hide']();
    }

    function change_showhide_time(obj) {
        obj.field[obj.checked ? 'slideDown' : 'slideUp'](200);
    }

    // show/hide range date
    $('[data-showRangeDate-Checkbox]').each(function() {
        var obj = {};
        obj.label = $(this);
        obj.name = obj.label.attr('data-showRangeDate-Checkbox');
        obj.checkbox = obj.label.find('input[type="checkbox"]');
        obj.field = $('[data-showRangeDate-Field="' + obj.name + '"]');
        obj.checked = obj.checkbox.is(':checked');

        change_showhide_date(obj);

        obj.checkbox.on('change', function() {
            obj.checked = obj.checkbox.is(':checked');

            change_showhide_date(obj);
        });
    });

    $('[data-showTime-Checkbox]').each(function() {
        var obj = {};
        obj.label = $(this);
        obj.name = obj.label.attr('data-showTime-Checkbox');
        obj.checkbox = obj.label.find('input[type="checkbox"]');
        obj.field = $('[data-showTime-Field="' + obj.name + '"]');
        obj.checked = obj.checkbox.is(':checked');

        change_showhide_time(obj);

        obj.checkbox.on('change', function() {
            obj.checked = obj.checkbox.is(':checked');
            change_showhide_time(obj);
        });
    });

    $('[data-phonecode]').phonecode({
        preferCo: 'ru',
        default_prefix: '7',
        prefix: 'load[phone_prefix]'
    });
});

// --- type calc dropdown -----------------------------------------
$(document).ready(function() {
  function change_calctype(obj) {
    if (obj.blocked) {
      obj.controlled.prop('disabled', true)
    } else {
      obj.controlled.prop('disabled', false)
    }
  }

  $('[data-calctype]').each(function() {
    var obj = {};
    obj.calctype = $(this);
    obj.control = obj.calctype.find('[data-calctype-dropdown="control"]');
    obj.controlled = obj.calctype.find('[data-calctype-dropdown="controlled"]');
    obj.blocked = obj.control.val() == 0;

    change_calctype(obj)
  });

  $('body').on('change', '[data-calctype-dropdown="control"]', function() {
    var obj = {};
    obj.control = $(this);
    obj.calctype = obj.control.parents('[data-calctype]:first');
    obj.controlled = obj.calctype.find('[data-calctype-dropdown="controlled"]');
    obj.blocked = obj.control.val() == 0;

    change_calctype(obj)
  });
});

// --- request bid ------------------------------------------------
$(document).ready(function() {
  function check_bid() {
    var checkbox = $('[data-requestbid="checkbox"]');
    var items = $('[data-requestbid="item"]');
    var label = $('[data-requestbid="label"]');
    var is_hide = checkbox.is(':checked');
    if (is_hide) {
      items.slideUp(200);
      label.addClass('RequestBid');
    } else {
      items.slideDown(200);
      label.removeClass('RequestBid');
    }
  }
  check_bid();
  $('[data-requestbid="checkbox"]').change(function() {
    check_bid();
  });
});

// --- radio visible ----------------------------------------------
$(document).ready(function() {
  function radio_visible(obj) {
    $('[data-visible-group="' + obj.group + '"][data-visible-block-param]').hide();
    $('[data-visible-group="' + obj.group + '"][data-visible-block-param="' + obj.param + '"]').show();
  }

  function get_radio_obj(item) {
    var obj = {};
    obj.param = item.attr('data-visible-checkbox-param');
    obj.group = item.attr('data-visible-group');

    return obj;
  }

  $('[data-visible-checkbox-param]').each(function() {
    var that = $(this);
    var obj = get_radio_obj(that);
    radio_visible(obj);
  });

  $('body').on('change', '[data-visible-checkbox-param]', function() {
    var that = $(this);
    var obj = get_radio_obj(that);
    radio_visible(obj);
  });
});

// --- page size --------------------------------------------------
function get_page_mode() {
  var w = $(window).width();
  if (w > 1140) {
    return 'desktop';
  } else if (w > 720) {
    return 'tablet';
  } else {
    return 'mobile';
  }
}

function change_page_mode() {
  var mode = get_page_mode();
  switch (mode) {
    case 'desktop':
      $('html').removeClass('ModeTablet ModeMobile').addClass('ModeDesktop');
      break;
    case 'tablet':
      $('html').removeClass('ModeDesktop ModeMobile').addClass('ModeTablet');
      break;
    case 'mobile':
      $('html').removeClass('ModeDesktop ModeTablet').addClass('ModeMobile');
      break;
  }
}

change_page_mode();
$(window).resize(function() {
  change_page_mode();
});

// --- menu -------------------------------------------------------
$(document).ready(function() {
  $('[data-type="MenuMobileButton"]').on('click', function (e) {
    $('body, .wrapper').css({'overflow':'hidden'});
    $('[data-type="MenuMobileBackground"]').fadeIn(100);
    $('[data-type="MenuMobile"]').show('slide', {
      direction: 'right'
    }, 300);
  });
  $('[data-type="MenuMobileBack"]').on('click', function (e) {
    $('body, .wrapper').removeAttr('style');
    $('[data-type="MenuMobile"]').hide('slide', {
      direction: 'right'
    }, 300);
    $('[data-type="MenuMobileBackground"]').fadeOut(100);
  });
  $('[data-type="MenuMobileBackground"]').on('click', function (e) {
    $('body, .wrapper').removeAttr('style');
    $('[data-type="MenuMobile"]').hide('slide', {
      direction: 'right'
    }, 300);
    $('[data-type="MenuMobileBackground"]').fadeOut(100);
  });
});

// --- checkbox ---------------------------------------------------
function check_checkbox(checkboxes) {
  checkboxes.each(function() {
    var checkbox = $(this);
    var icon = checkbox.find('.go-icon');
    var field = checkbox.find('input[type="checkbox"]');
    field.addClass('hide');

    if (field.is(':checked')) {
      icon.addClass('go-icon-checkbox-enable').removeClass('go-icon-checkbox-disable');
    } else {
      icon.addClass('go-icon-checkbox-disable').removeClass('go-icon-checkbox-enable');
    }
  });
}

$(document).ready(function() {
  $('[data-type="checkbox"]').each(function() {
    var checkbox = $(this);
    checkbox.prepend('<i class="go-icon"></i>');

    check_checkbox(checkbox);
    checkbox.find('input[type="checkbox"]').change(function() {
      check_checkbox(checkbox);
    });
  });
});

// --- radiobutton ------------------------------------------------
function check_radiobutton(radiobuttons) {
  radiobuttons.each(function() {
    var radiobutton = $(this);
    var field = radiobutton.find('input[type="radio"]');
    var name = field.attr('name');
    var set = $('input[type="radio"][name="' + name + '"]').parents('[data-type="radiobutton"]');

    set.each(function() {
      var item = $(this);
      var icon = item.find('.go-icon');
      var field = item.find('input[type="radio"]');
      field.addClass('hide');

      if (field.is(':checked')) {
        icon.addClass('go-icon-radiobutton-enable').removeClass('go-icon-radiobutton-disable');
      } else {
        icon.addClass('go-icon-radiobutton-disable').removeClass('go-icon-radiobutton-enable');
      }
    });
  });
}

$(document).ready(function() {
  $('[data-type="radiobutton"]').each(function() {
    var radiobutton = $(this);
    radiobutton.prepend('<i class="go-icon"></i>');

    check_radiobutton(radiobutton);
    radiobutton.find('input[type="radio"]').change(function() {
      check_radiobutton(radiobutton);
    });
  });
});

// --- all --------------------------------------------------------
function dropdown_styled(dd) {
    var placeholder = dd.attr('placeholder') || '',
        clear = dd.attr('data-dropdown-clear') == 'true' || false,
        search = dd.attr('data-dropdown-search') == 'false',
        add_class = '';
    if (search) {
        add_class += 'Dropdown-NoSearch ';
    }

    dd.select2({
        placeholder: placeholder,
        allowClear: clear,
        containerCssClass: add_class,
        dropdownCssClass: add_class
    });
}

var datepicker_data = {
    dateFormat: 'dd.mm.yy',
    dayNames: ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"],
    dayNamesMin: ["ВС", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"],
    dayNamesShort: ["ВС", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"],
    firstDay: 1,
    monthNames: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
    monthNamesShort : ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"],
};

function getDate(element) {
    var date;
    try {
        date = $.datepicker.parseDate(datepicker_data.dateFormat, element.value);
    } catch( error ) {
        date = null;
    }
    return date;
};

$(document).ready(function() {
  // ----- datepicker ---------------------------------------------
  $('[data-type="datepicker"]:not([data-datepicker-min]):not([data-datepicker-max])').each(function() {
    var obj = $(this);
    obj.datepicker(datepicker_data);
  });
  $('[data-datepicker-range]').each(function() {
    var block = $(this),
        range = $('input[name=load\\[has_dispatch_date_range\\]]');
        date_from = block.find('[data-datepicker-min]');
        date_to = block.find('[data-datepicker-max]');
        date_from.datepicker(datepicker_data)
          .on('change', function() {
            date_to.datepicker('option', 'minDate', getDate(this));
          }),
        date_to.datepicker(datepicker_data)
          .on('change', function() {
            date_from.datepicker('option', 'maxDate', getDate(this));
          });
  });

  // Обнуления даты диапазона
  $(document).on('change', 'input[name=load\\[has_dispatch_date_range\\]]', function() {
    var max = $('input[name=load\\[dispatch_date_max\\]]'),
        min = $('input[name=load\\[dispatch_date_min\\]]');
    if($(this).is(':checked')) {
      max.datepicker('option', 'maxDate', getDate(min));
    } else {
      max.val(null).datepicker('option', 'minDate', null);
      min.datepicker('option', 'maxDate', null);
    }
  });

  // ----- validator ----------------------------------------------
  // валидация поля по потере фокуса
  function check_valid_field(item, is_color) {
    var field = item.find('[data-validator-field]');
    var val = field.val();
    var tag = field[0].tagName.toLowerCase();
    var valid = false;
    if (tag == 'select') {
      if (parseInt(val) > 0) {
        valid = true;
      }
    } else {
      if (val.length > 0) {
        valid = true;
      }
    }
    if (valid) {
      item.attr('data-validator-required', 'success');
      if (is_color) {
        item.removeClass('Validator-Alert').addClass('Validator-Success');
      }
    } else {
      item.attr('data-validator-required', 'alert');
      if (is_color) {
        item.removeClass('Validator-Success').addClass('Validator-Alert');
      }
    }
  }

  // валидация формы
  function check_valid_form(form) {
    var required = form.find('[data-validator-required]');
    var valid = true;

    required.each(function() {
      var that = $(this);
      check_valid_field(that, false);
      if (that.attr('data-validator-required') != 'success') {
        valid = false;
      }
    });

    if (valid) {
      form.find('[data-validator-submit]').prop('disabled', false);
    } else {
      form.find('[data-validator-submit]').prop('disabled', true);
    }
  }

  $('form').each(function() {
    var form = $(this);

    form.on('blur', '[data-validator-required]', function() {
      var item = $(this);
      check_valid_field(item, true);

      check_valid_form(form);
    });

    check_valid_form(form);
  });

    // user menu
    $('[data-usermenu="button"]').on('click', function() {
        $(this).toggleClass('UserPanel_Link-Active');
        $('[data-usermenu="content"]').slideToggle(200).toggleClass('UserMenu-Active');
    });

    // dropdown
    $('[data-dropdown]').each(function() {
        dropdown_styled($(this));
    });
});

// --- popup window -----------------------------------------------
function pw_open(obj) {
  obj.pw.inner.html('').append(obj.content);
  obj.pw.block.fadeIn(200);
  window.setTimeout(function() {
    var top = $(window).scrollTop() + 100;
    var pw_h = obj.pw.inner.outerHeight();
    var max_top = $('body').height() - pw_h - 100;
    if (top > max_top) {
      top = max_top;
    }
    if (top < 100) {
      top = 100;
    }
    obj.pw.content.animate({'top': top});
  }, 200);
}

function pw_close(obj) {
  obj.pw.block.fadeOut(200);
  obj.pw.block.after(obj.pw.inner.children());
}

$(document).ready(function() {
  var pw = $('[data-type="pw"]');
  var obj = {
    pw: {
      block: pw,
      content: pw.find('[data-type="pw_content"]'),
      inner: pw.find('[data-type="pw_content_inner"]'),
      bg: pw.find('[data-type="pw_bg"]'),
      close: pw.find('[data-type="pw_close"]')
    },
    content: ''
  };

  // открытие попапа
  $('[data-pw-open]').on('click', function() {
    var link = $(this);
    var selector = link.attr('data-pw-open');
    var content = $(selector);
    obj.content = content;
    pw_open(obj);
    return false;
  });

  // закрытие попапа
  obj.pw.bg.on('click', function() {
    pw_close(obj);
  });
  obj.pw.close.on('click', function() {
    pw_close(obj);
  });
});

$(function() {
    $(document).on('change', '[name="load[shipping_type]"]', function() {
      var block = $('#transport-types-block');
      if(['separate', 'can_add'].includes($(this).val())) {
        block.show();
      } else {
        block.hide();
      }
    });

    $('[name="load[company_full_name]"]').suggestions({
      token: "171e25c2357362a4cc41a7c987eb02518def710f",
      type: "PARTY",
      onSelect: function(suggestion) {
        // Вывод информации под полем
        var info = [];
        info.push(suggestion.unrestricted_value);
        info.push(suggestion.data.address.unrestricted_value);
        info.push('ИНН ' + suggestion.data.inn);
        if(suggestion.data.kpp) { info.push('КПП ' + suggestion.data.kpp); }
        $('#companyInfo').html(info.join(', '));

        // Заполнение скрытых полей
        $('#input-company-name').val(suggestion.data.name.short);
        $('#input-opf').val(suggestion.data.opf.short);
        $('#input-inn').val(suggestion.data.inn);
      }
    });
});

var map_form_errors = function(errors) {
    for(var key in errors) {
        if(errors.hasOwnProperty(key)) {
            map_form_error(key, errors[key])
        }
    }
};

var tooltip = null;
var map_form_error = function(key, value) {
  $('.validate-load-' + key).addClass('Validator-Error').attr('title', value.join(', '));
};
$(document).on('mouseover', '.Validator-Error', function(e) {
  if(tooltip) tooltip.remove();
  tooltip = document.createElement('div');
  tooltip.classList.add('Tooltip', 'Tooltip-Right');
  tooltip.innerText = $(this).attr('title');
  $(this).append(tooltip);
});
$(document).on('mouseleave', '.Validator-Error', function(e) {
  if(tooltip) tooltip.remove();
});
$('[class*=validate-load]').each(function(idx, elem) {
  $($(elem).children()[0]).on('change', function() {
    $(this).closest('.Validator-Error').removeClass('Validator-Error').addClass('Validator');
  });
});

// Submits registration form via ajax
$(document).on('click', '.remote-form', function(e) {
  e.preventDefault();
  var btn = $('#form-submit-btn'),
      spinner = $('#spinner'),
      form = $(this).closest('form');
  btn.addClass('hidden');
  spinner.removeClass('hidden');
  $.ajax({
    url: form.attr('action'),
    data: form.serialize(),
    dataType: 'json',
    type: 'post',
    success: function(data) {
      console.log(data);
      if(data.success) {
         (typeof data.load_redirect == "undefined") ? window.location = data.redirect_url + '?redirect_url='
		 + data.load_url : window.location.href = data.load_redirect;
      } else {
        map_form_errors(data.errors);
        alert('Возникли ошибки при добавлении груза. Проверьте правильность заполнения полей формы.');
        btn.removeClass('hidden');
        spinner.addClass('hidden');
      }
    },
    error: function() {
      btn.removeClass('hidden');
      spinner.addClass('hidden');
    }
  })
});
