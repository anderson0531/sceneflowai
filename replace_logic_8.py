import replace_logic_6

new_return = replace_logic_6.new_return.replace("{wardrobe_bottom}\n        </div>\n      </div>\n\n{rest_section}", "{wardrobe_bottom}\n        </div>\n\n{rest_section}")

with open('new_character_card.tsx', 'w') as f:
    f.write(replace_logic_6.before_return + new_return)

